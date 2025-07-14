def call () {
    if (env.BRANCH_NAME == "main" || 
        env.BRANCH_NAME.startsWith("fe/") || 
        env.BRANCH_NAME.startsWith("be/")) {

        stage('Install Dependencies') {
            script {
                if (env.BRANCH_NAME.startsWith("fe/") || env.BRANCH_NAME == "main") {
                    dir('frontend') {
                        echo 'Installing frontend dependencies...'
                        sh 'npm install'
                    }
                }
                if (env.BRANCH_NAME.startsWith("be/") || env.BRANCH_NAME == "main") {
                    dir('backend') {
                        echo 'Installing backend dependencies...'
                        sh 'npm install'
                    }
                }
            }
        }
    } else {
        echo "Branch ${env.BRANCH_NAME} is not configured to install dependencies."
    }
}