@Library('cicd_lib')
// This Jenkinsfile defines a CI/CD pipeline for a Next.js application with a frontend and backend.
// It includes stages for checking out code, building and pushing Docker images, and deploying or rolling

pipeline {
    agent any

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
                        test('frontend')
                    }
                    if (env.BRANCH_NAME.startsWith("be/") || env.BRANCH_NAME == "main") {
                        test('backend')
                    }
                }
            }
        }

        // Stage to clean up dangling Docker images
        stage('Cleanup After Build') {
            steps {
                script {
                    cleanDocker()
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
                        deployVM('frontend')
                    }
                    if (env.BRANCH_NAME.startsWith("be/") || env.BRANCH_NAME == "main") {
                        deployVM('backend')
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