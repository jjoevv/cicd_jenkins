pipeline {
    agent any
    tools {
            nodejs 'NodeJS 24.3.0'
        }

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')      // Jenkins Credentials: username & password
        DOCKERHUB_USERNAME = "${DOCKERHUB_CREDENTIALS_USR}"         // Username for Docker Hub
        DOCKERHUB_PASSWORD = "${DOCKERHUB_CREDENTIALS_PSW}"         // Password for Docker Hub
        TAG = "build-${env.BUILD_NUMBER}"                                 // Tag for images using Jenkins build number

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
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    
                    if (branchName.startsWith("fe") || branchName == "main") {
                        if (fileExists('frontend')) {
                            dir('frontend') {
                            echo 'Installing frontend dependencies...'
                            sh 'npm install'
                        }
                        } else {
                            echo "⚠️ Folder 'frontend' does not exist. Skipping backend dependency installation."
                        }
                        
                        if (fileExists('backend')) {
                            echo 'Installing backend dependencies with package-lock.json...'
                            sh 'npm install'
                        } else {
                            echo 'No package-lock.json found, using npm install.'
                        }
                        
                    }
                }
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    def imageName = branchName.startsWith("fe") ? IMAGE_FE : IMAGE_BE                    
                    def service = branchName.startsWith("fe") ? 'frontend' : 'backend'
                    
                    echo "${branchName} Building Docker image for ${service} with tag ${imageName}:${TAG}..."
                    
                    if (branchName.startsWith('main')) {
                        echo "Building and pushing Docker image for ${service}..."
                        
                        echo "${DOCKERHUB_PASSWORD}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin
                        if (fileExists('frontend')) {
                            sh """

                            docker build -t ${IMAGE_FE}:latest -t ${IMAGE_FE}:${TAG} ./frontend

                            docker push ${IMAGE_FE}:latest 
                            docker push ${IMAGE_FE}:${TAG}

                            docker logout
                            """
                        }
                        if (fileExists('backend')) {
                            sh """

                            docker build -t ${IMAGE_BE}:latest -t ${IMAGE_BE}:${TAG} ./backend

                            docker push ${IMAGE_BE}:latest 
                            docker push ${IMAGE_BE}:${TAG}

                            docker logout
                            """
                        }
                        
                    } else {

                    if (params.SKIP_BUILD_IMAGE && params.SKIP_PUSH_IMAGE) {
                        echo "Skipping Docker build and push for ${service} because SKIP_BUILD_IMAGE and SKIP_PUSH_IMAGE are true."
                    } else {
                            dir(service) {
                                sh 'docker info || { echo "Docker is not running. Exiting."; exit 1; }'
                                echo "Building and pushing Docker image for ${service}..."

                                sh """
                                    echo "${DOCKERHUB_PASSWORD}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin

                                    docker build -t ${imageName}:latest -t ${imageName}:${TAG} .

                                    docker push ${imageName}:latest
                                    docker push ${imageName}:${TAG}

                                    docker logout
                                """
                            }
                        }
                    }
                    

                }
            }
        }


        stage('Test') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    // Check if both frontend and backend directories exist
                    if (fileExists('frontend')) {
                        if (branchName.startsWith("fe") || branchName == "main") {
                        dir('frontend') {
                            echo '🧪 Running frontend tests...'
                            sh 'npm test'
                        }
                    }

                    } else {
                        echo "⚠️ One or both of the 'frontend' and 'backend' directories do not exist. Skipping tests."
                        return
                    }
                    if (fileExists('backend')) {
                        if (branchName.startsWith("be") || branchName == "main") {
                            echo '🧪 Running backend tests...'
                            dir('backend') {
                                sh 'npm test'
                            }
                        }
                    } else {
                        echo "⚠️ One or both of the 'frontend' and 'backend' directories do not exist. Skipping tests."
                        return
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
