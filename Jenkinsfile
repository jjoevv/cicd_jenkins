pipeline {
    agent any
    tools {
            nodejs 'NodeJS 24.3.0'
        }

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')      // Jenkins Credentials: username & password
        DOCKERHUB_USERNAME = "${DOCKERHUB_CREDENTIALS_USR}"         // Username for Docker Hub
        DOCKERHUB_PASSWORD = "${DOCKERHUB_CREDENTIALS_PSW}"         // Password for Docker Hub
        TAG = "build-${env.BUILD_NUMBER}"                           // Tag for images using Jenkins build number
        BRANCH_NAME_ENV = "${env.BRANCH_NAME}"                      // Branch name from the environment  

        USER_SERVER = 'dev'                                         // SSH user on lab server
        SERVER_IP = credentials('LAB_SERVER_IP')                    // Lab server IP from Secret Text Credential
        TARGET_PATH = '/home/dev/democicd/'                          // Target path on the lab server
        IMAGE_FE = "${DOCKERHUB_USERNAME}/demo-nextappfe"           // Docker Hub FE image
        IMAGE_BE = "${DOCKERHUB_USERNAME}/demo-nextappbe"           // Docker Hub BE image

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
                    if (env.BRANCH_NAME.startsWith("fe/") || env.BRANCH_NAME == "main") {
                        install('frontend')
                    }
                    if (env.BRANCH_NAME.startsWith("be/") || env.BRANCH_NAME == "main") {
                        install('backend')
                    }
                }
            }
        }
        // Stage to build Docker images
        // This stage will build Docker images for both frontend and backend
        // It will only run if the SKIP_BUILD_IMAGE parameter is false
    
        stage('Build Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    expression { env.BRANCH_NAME.startsWith('fe/') }
                    expression { env.BRANCH_NAME.startsWith('be/') }
                }
            }
            steps {
                script {
                    if (env.BRANCH_NAME.startsWith("fe/") || env.BRANCH_NAME == "main") {
                        buildDockerImage('frontend')
                    }
                    if (env.BRANCH_NAME.startsWith("be/") || env.BRANCH_NAME == "main") {
                        buildDockerImage('backend')
                    }
                }
            }
        }

        // Stage to push Docker images to Docker Hub
        // This stage will run only if the branch is main or starts with 'fe/' or 'be/'
        // It will push the images to Docker Hub using the credentials stored in Jenkins
        // The images will be tagged with 'latest' and the build number
        // If SKIP_PUSH_IMAGE is true, this stage will be skipped
        stage('Push Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    expression { env.BRANCH_NAME.startsWith('fe/') }
                    expression { env.BRANCH_NAME.startsWith('be/') }
                }
            }
            steps {
                script {
                    if (env.BRANCH_NAME.startsWith("fe/") || env.BRANCH_NAME == "main") {
                        pushDockerImage('frontend')
                    }
                    if (env.BRANCH_NAME.startsWith("be/") || env.BRANCH_NAME == "main") {
                        pushDockerImage('backend')
                    }
                }
            }
        }

        // Stage to run tests
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
            when {
                branch 'main'
            }
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

                                IMAGE_FE="${IMAGE_FE}:${TAG}"
                                IMAGE_BE="${IMAGE_BE}:${TAG}"

                                DEPLOY_FE=false
                                DEPLOY_BE=false

                                echo "🔍 Checking if frontend image \$IMAGE_FE exists..."
                                if docker manifest inspect \$IMAGE_FE > /dev/null 2>&1; then
                                    echo "✅ Frontend image found. Will deploy frontend."
                                    DEPLOY_FE=true
                                else
                                    echo "⚠️ Frontend image not found. Skipping frontend deployment."
                                fi

                                echo "🔍 Checking if backend image \$IMAGE_BE exists..."
                                if docker manifest inspect \$IMAGE_BE > /dev/null 2>&1; then
                                    echo "✅ Backend image found. Will deploy backend."
                                    DEPLOY_BE=true
                                else
                                    echo "⚠️ Backend image not found. Skipping backend deployment."
                                fi

                                if [ "\$DEPLOY_FE" = true ]; then
                                    echo "🚀 Deploying frontend..."
                                    docker compose -f docker-compose.fe.yml pull
                                    docker compose -f docker-compose.fe.yml up -d
                                fi

                                if [ "\$DEPLOY_BE" = true ]; then
                                    echo "🚀 Deploying backend..."
                                    docker compose -f docker-compose.be.yml pull
                                    docker compose -f docker-compose.be.yml up -d
                                fi

                                if [ "\$DEPLOY_FE" = false ] && [ "\$DEPLOY_BE" = false ]; then
                                    echo "⚠️ No images found for deployment. Skipping all."
                                fi
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
            githubNotify context: 'DemoCICD', status: 'FAILURE', description: 'Pipeline failed';
            mail to: 'hhnnttvy@gmail.com',
             subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
             body: "Something is wrong with ${env.BUILD_URL}"
        }
        always {
            cleanWs()
        }
    }
}
