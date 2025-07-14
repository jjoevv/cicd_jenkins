def call(String imageName, String tag, String DOCKERHUB_USERNAME, String DOCKERHUB_PASSWORD) {
    stage("Push Docker Image for ${service}") {
        def imageName = service == 'frontend' ? "${env.IMAGE_FE}" : "${env.IMAGE_BE}"
        def buildTag = "${imageName}:${env.TAG}"
        def latestTag = "${imageName}:latest"

        if (params.SKIP_PUSH_IMAGE) {
            echo "Skipping Docker push for ${service} because SKIP_PUSH_IMAGE is true."
            return
        }

        echo "Logging in to Docker Hub..."
        
    
        sh """
        echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
        echo "🚀 Pushing Docker images to Docker Hub..."

        docker push $imageName:latest
        docker push $imageName:$tag

        docker logout
        """
    }

    
}