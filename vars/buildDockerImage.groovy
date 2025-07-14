def call (String imageName, String buildTag) {
    stage("Build Docker Image for ${service}") {
        def imageName = service == 'frontend' ? "${env.IMAGE_FE}" : "${env.IMAGE_BE}"
        def buildTag = "${imageName}:${env.TAG}"
        def latestTag = "${imageName}:latest"

        if (params.SKIP_BUILD_IMAGE) {
            echo "Skipping Docker build for ${service} because SKIP_BUILD_IMAGE is true."
            return
        }
        
        dir(service) {
            sh 'docker info || { echo "Docker is not running. Exiting."; exit 1; }'
            echo "Building Docker image for ${service}..."
            sh """
                docker build -t $imageName:latest -t $imageName:$buildTag
            """
        }
    }
}