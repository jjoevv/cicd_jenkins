def call(String imageName, String dir, String tag, String DOCKERHUB_USERNAME, String DOCKERHUB_PASSWORD) {
    echo "🚀 Pushing Docker images to Docker Hub..."

    sh """
    echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

    docker push $imageName:latest
    docker push $imageName:$tag

    docker logout
    """
}