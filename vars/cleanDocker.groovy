def call() {
    echo "🧹 Cleaning up dangling Docker images again after build..."
    sh 'docker system prune -af'
    sh 'docker image prune -f'  
    sh 'docker volume prune -f'
    sh 'docker container prune -f'
}