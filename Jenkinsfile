@Library('cicd_lib') // Import the GitHub Notify library for notifications
// This Jenkinsfile defines a CI/CD pipeline for a Next.js application with a frontend and backend.
// It includes stages for checking out code, building and pushing Docker images, and deploying or rolling

pipeline {
    agent any

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
    /*
    tools {
        nodejs 'NodeJS 24.3.0'
    }*/
    // Parameters for the pipeline
    parameters {
        booleanParam(
            name: 'ROLLBACK', defaultValue: false, description: 'Tick to rollback instead of deploy'
            )
        string(
            name: 'ROLLBACK_TAG', defaultValue: '', description: 'Image tag to rollback (required if ROLLBACK is true)'
            )
        booleanParam(
            name: 'SKIP_PUSH_IMAGE', defaultValue: false, description: 'Tick to skip pushing Docker images to Docker Hub'
            )
        booleanParam(
            name: 'SKIP_BUILD_IMAGE', defaultValue: true, description: 'Tick to skip building Docker images'
            )
    }

    stages {
        stage('Checkout') { // Checkout the code from SCM
            steps {
                checkout scm // This will checkout the code from the configured SCM (e.g., Git)
            }
        }
        // Stage to install dependencies for linting and testing
        // This stage will run npm install in both frontend and backend directories
        stage('Install Dependencies') {
            script {
                if (BRANCH_NAME_ENV.startsWith("fe/") || BRANCH_NAME_ENV == "main") {
                    dir('frontend') {
                        echo 'Installing frontend dependencies...'
                        sh 'npm install'
                    }
                }
                if (BRANCH_NAME_ENV.startsWith("be/") || BRANCH_NAME_ENV == "main") {
                    dir('backend') {
                        echo 'Installing backend dependencies...'
                        sh 'npm install'
                    }
                }
            }
        }

        // Stage to build Docker images
        // This stage will build Docker images for both frontend and backend
        // It will only run if the SKIP_BUILD_IMAGE parameter is false
    
        stage("Build Docker Image") {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    def imageName = branchName.startsWith("fe/") ? IMAGE_FE : IMAGE_BE
                    def service = branchName.startsWith("fe/") ? 'frontend' : 'backend'

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


        // Stage to push Docker images to Docker Hub
        // This stage will run only if the branch is main or starts with 'fe/' or 'be/'
        // It will push the images to Docker Hub using the credentials stored in Jenkins
        // The images will be tagged with 'latest' and the build number
        // If SKIP_PUSH_IMAGE is true, this stage will be skipped
        stage('Push Docker Images') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: "unknown"
                    def imageName = branchName.startsWith("fe/") ? IMAGE_FE : IMAGE_BE
                    def service = branchName.startsWith("fe/") ? 'frontend' : 'backend'

                    if (params.SKIP_PUSH_IMAGE) {
                        echo "Skipping Docker push for ${service} because SKIP_PUSH_IMAGE is true."
                    } else {
                        echo "Logging in to Docker Hub..."

                        sh """
                            echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
                            echo "🚀 Pushing Docker images to Docker Hub..."

                            docker push ${imageName}:latest
                            docker push ${imageName}:${TAG}

                            docker logout
                        """
                    }
                }
            }
        }


        // Stage to run tests
        stage('Test') {
            when {
                anyOf {
                    branch 'main'
                    expression { BRANCH_NAME_ENV.startsWith('fe/') }
                    expression { BRANCH_NAME_ENV.startsWith('be/') }
                }
            }
            steps {
                script {
                    if (BRANCH_NAME_ENV.startsWith("fe/") || BRANCH_NAME_ENV == "main") {
                        dir('frontend') {
                            echo '🧪 Running unit tests...'
                            sh 'npm test'
                        }
                    }
                    if (BRANCH_NAME_ENV.startsWith("be/") || BRANCH_NAME_ENV == "main") {
                        dir('backend') {
                            echo '🧪 Running unit tests...'
                            sh 'npm test'
                        }
                    }
                }
            }
        }

        // Stage to clean up dangling Docker images
        stage('Cleanup After Build') {
            steps {
                script {
                    echo "🧹 Cleaning up dangling Docker images again after build..."
                    sh 'docker system prune -af'
                    sh 'docker image prune -f'  
                    sh 'docker volume prune -f'
                    sh 'docker container prune -f'
                }
            }
        }

        // Stage to deploy or rollback the application
        // This stage will run regardless of the ROLLBACK parameter
        // It will either deploy the latest images or rollback to a specified tag
        // Uses SSH to connect to the lab server and manage Docker containers
        // If ROLLBACK is true, it will pull the specified tag and redeploy
        // If ROLLBACK is false, it will pull the latest images and redeploy
        // Uses the credentials stored in Jenkins for SSH access
        // The server IP is stored in a Secret Text Credential
        // The deployment is done using docker compose to manage the containers
       stage('Deploy or Rollback') {
            steps {
                sshagent(['vps-ssh']) { 
                    script {
                        
                        // Ensure the docker-compose.yml file is present in the workspace
                        if (!fileExists('docker-compose.yml') || !fileExists('prometheus.yml')) {
                            error('❌ docker-compose.yml or prometheus file not found in the workspace. Please ensure it exists.')
                        } else  {
                            script {
                                def copySuccess = false

                                // Try IP LAN
                                try {
                                    echo "Trying to copy via IP LAN"
                                    sh """
                                    
                                        mkdir -p /home/dev/nextapp 

                                        scp -o ConnectTimeout=20 -o StrictHostKeyChecking=no docker-compose.yml ${USER_SERVER}@${SERVER_IP}:${TARGET_PATH}docker-compose.yml
                                        scp -o ConnectTimeout=20 -o StrictHostKeyChecking=no prometheus.yml ${USER_SERVER}@${SERVER_IP}:${TARGET_PATH}prometheus.yml
                                        
                                    """

                                    echo "✅ Copied via IP LAN successfully."
                                    copySuccess = true
                                } catch (err) {
                                    echo "⚠️ Failed to copy via IP LAN (${SERVER_IP})... ${err.getMessage()}"
                                }


                                // If all fail, fail the pipeline
                                if (!copySuccess) {
                                    error("Connect failed. Please check the server IP and SSH credentials.")
                                }
                            }
                        }
                       
                        def deployCommand = """
                            ssh -o StrictHostKeyChecking=no ${USER_SERVER}@${SERVER_IP} '
                                set -e
                                echo "🚀 Starting deployment..."

                                mkdir -p /home/dev/nextapp &&
                                cd /home/dev/nextapp &&

                                docker compose pull
                                docker compose up -d

                                echo "✅ Deployment complete."
                            '
                        """

                        def rollbackCommand = """
                            ssh -o StrictHostKeyChecking=no ${USER_SERVER}@${SERVER_IP} '
                                set -e
                                echo "🔄 Rolling back to tag ${params.ROLLBACK_TAG}..."

                                docker pull ${IMAGE_FE}:${params.ROLLBACK_TAG}
                                docker pull ${IMAGE_BE}:${params.ROLLBACK_TAG}

                                docker tag ${IMAGE_FE}:${params.ROLLBACK_TAG} ${IMAGE_FE}:latest
                                docker tag ${IMAGE_BE}:${params.ROLLBACK_TAG} ${IMAGE_BE}:latest

                                mkdir -p /home/dev/nextapp &&
                                cd /home/dev/nextapp &&

                                docker compose down

                                docker compose up -d

                                echo "✅ Rollback complete."
                            '
                        """

                        if (params.ROLLBACK) {
                            if (!params.ROLLBACK_TAG) {
                                error('❌ ROLLBACK_TAG is required when ROLLBACK is true.')
                            }
                            echo "🔄 Executing rollback to tag ${params.ROLLBACK_TAG}..."
                            sh rollbackCommand
                        } else {
                            sh 'echo "🚀 Executing deployment with latest images... ${SERVER_IP}"'
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