pipeline {
    agent any
    tools {
            nodejs 'NodeJS 24.3.0'
        }

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
        DOCKERHUB_USERNAME = "${DOCKERHUB_CREDENTIALS_USR}"
        DOCKERHUB_PASSWORD = "${DOCKERHUB_CREDENTIALS_PSW}"
        TAG = "build-${BUILD_NUMBER}"

        USER_SERVER = 'dev'
        SERVER_IP = credentials('LAB_SERVER_IP')
        TARGET_PATH = '/home/dev/democicd/'
        IMAGE_FE = "${DOCKERHUB_USERNAME}/demo-nextappfe"
        IMAGE_BE = "${DOCKERHUB_USERNAME}/demo-nextappbe"
    }

    parameters {
        booleanParam(name: 'ROLLBACK', defaultValue: false, description: 'Tick to rollback instead of deploy')
        string(name: 'ROLLBACK_TAG', defaultValue: '', description: 'Image tag to rollback (required if ROLLBACK is true)')
        booleanParam(name: 'SKIP_PUSH_IMAGE', defaultValue: false, description: 'Tick to skip pushing Docker images to Docker Hub')
        booleanParam(name: 'SKIP_BUILD_IMAGE', defaultValue: false, description: 'Tick to skip building Docker images')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    
                    if (branchName.startsWith("fe") || branchName == "main") {
                        dir('frontend') {
                            echo 'Installing frontend dependencies...'
                            sh 'npm install'
                        }
                    }
                    if (branchName.startsWith("be") || branchName == "main") {
                        dir('backend') {
                            echo 'Installing backend dependencies...'
                            sh 'npm install'
                        }
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    def imageName = branchName.startsWith("fe") ? IMAGE_FE : IMAGE_BE
                    def service = branchName.startsWith("fe") ? 'frontend' : 'backend'
                    echo "${branchName} Building Docker image for ${service} with tag ${imageName}:${TAG}..."
                    if (params.SKIP_BUILD_IMAGE) {
                        echo "Skipping Docker build for ${service} because SKIP_BUILD_IMAGE is true."
                    } else {
                        dir(service) {
                            sh 'docker info || { echo "Docker is not running. Exiting."; exit 1; }'
                            echo "Building Docker image for ${service}..."
                            sh """
                                docker build -t ${imageName}:latest -t ${imageName}:${TAG} .
                            """
                        }
                    }
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    def imageName = branchName.startsWith("fe") ? IMAGE_FE : IMAGE_BE
                    def service = branchName.startsWith("fe") ? 'frontend' : 'backend'

                    if (params.SKIP_PUSH_IMAGE) {
                        echo "Skipping Docker push for ${service} because SKIP_PUSH_IMAGE is true."
                    } else {
                        echo "Logging in to Docker Hub..."
                        sh """
                            echo "${imageName}:latest" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin
                            echo "🚀 Pushing Docker images..."
                            docker push ${imageName}:latest
                            docker push ${imageName}:${TAG}
                            docker logout
                        """
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    if (branchName.startsWith("fe") || branchName == "main") {
                        dir('frontend') {
                            echo '🧪 Running frontend tests...'
                            sh 'npm test'
                        }
                    }
                    if (branchName.startsWith("be") || branchName == "main") {
                        dir('backend') {
                            echo '🧪 Running backend tests...'
                            sh 'npm test'
                        }
                    }
                }
            }
        }

        stage('Cleanup After Build') {
            steps {
                script {
                    echo "🧹 Cleaning up dangling Docker images..."
                    sh 'docker system prune -af'
                    sh 'docker image prune -f'
                    sh 'docker volume prune -f'
                    sh 'docker container prune -f'
                }
            }
        }

        stage('Deploy or Rollback') {
            steps {
                sshagent(['vps-ssh']) {
                    script {
                        if (!fileExists('docker-compose.yml') || !fileExists('prometheus.yml')) {
                            error('❌ docker-compose.yml or prometheus.yml not found in workspace.')
                        }
                        def copySuccess = false
                        try {
                            echo "Attempting to copy files to server..."
                            sh label: 'Copy docker-compose.yml to server', script: '''
                                mkdir -p ${TARGET_PATH} 

                                scp -o ConnectTimeout=20 -o StrictHostKeyChecking=no docker-compose.yml ${USER_SERVER}@${SERVER_IP}:${TARGET_PATH}docker-compose.yml
                                scp -o ConnectTimeout=20 -o StrictHostKeyChecking=no prometheus.yml ${USER_SERVER}@${SERVER_IP}:${TARGET_PATH}prometheus.yml
                            '''
                            copySuccess = true
                            echo "✅ Files copied successfully."
                        } catch (err) {
                            echo "⚠️ Failed to copy files: ${err.getMessage()}"
                        }
                        if (!copySuccess) {
                            error("Failed to copy files to server.")
                        }

                        def deployCommand = """
                            ssh -o StrictHostKeyChecking=no ${USER_SERVER}@${SERVER_IP} '
                                set -e
                                cd ${TARGET_PATH}
                                docker compose pull
                                docker compose up -d
                            '
                        """

                        def rollbackCommand = """
                            ssh -o StrictHostKeyChecking=no ${USER_SERVER}@${SERVER_IP} '
                                set -e
                                docker pull ${IMAGE_FE}:${params.ROLLBACK_TAG}
                                docker pull ${IMAGE_BE}:${params.ROLLBACK_TAG}
                                docker tag ${IMAGE_FE}:${params.ROLLBACK_TAG} ${IMAGE_FE}:latest
                                docker tag ${IMAGE_BE}:${params.ROLLBACK_TAG} ${IMAGE_BE}:latest
                                cd ${TARGET_PATH}
                                docker compose down
                                docker compose up -d
                            '
                        """

                        if (params.ROLLBACK) {
                            if (!params.ROLLBACK_TAG) {
                                error('❌ ROLLBACK_TAG is required when ROLLBACK is true.')
                            }
                            echo "🔄 Rolling back to tag ${params.ROLLBACK_TAG}..."
                            sh rollbackCommand
                        } else {
                            echo "🚀 Deploying latest images..."
                            sh deployCommand
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            githubNotify context: 'DemoCICD', status: 'SUCCESS', description: 'Pipeline passed'
        }
        failure {
            githubNotify context: 'DemoCICD', status: 'FAILURE', description: 'Pipeline failed'
        }
        always {
            cleanWs()
        }
    }
}
