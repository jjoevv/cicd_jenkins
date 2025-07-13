def call (String dir) {
    dir(dir) {
        echo '🧪 Running unit tests...'
        sh 'npm test'
    }
}