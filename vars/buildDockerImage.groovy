def call (String imageName, String dir, String tag) {
    sh 'docker info || { echo "Docker is not running. Exiting."; exit 1; }'

    echo "🛠 Building Docker images for ${imageName}..."

    sh """
    docker build -t $imageName:latest -t $imageName:$TAG $dir
    """
}