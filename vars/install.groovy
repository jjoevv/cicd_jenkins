def call (String dir) {
    dir(dir) {
        echo 'Installing dependencies...'
        sh 'npm install'
    }
}