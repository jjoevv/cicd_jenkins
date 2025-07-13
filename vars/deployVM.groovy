def call(Map config) {
    def USER_SERVER = config.USER_SERVER ?: error("❌ Missing USER_SERVER")
    def SERVER_IP = config.SERVER_IP ?: error("❌ Missing SERVER_IP")
    def IMAGE_NAME = config.IMAGE_NAME ?: error("❌ Missing IMAGE_NAME")
    def TARGET_PATH = config.TARGET_PATH ?: "/home/dev/nextapp"
    def SERVICE = config.SERVICE ?: error("❌ Missing SERVICE")
    def ROLLBACK = config.get('ROLLBACK', false)
    def ROLLBACK_TAG = config.get('ROLLBACK_TAG', "")

    echo "🚀 Starting deployment to ${SERVER_IP} (${SERVICE})"

    sshagent(['vps-ssh']) {
        if (ROLLBACK) {
            if (!ROLLBACK_TAG) {
                error("❌ ROLLBACK_TAG is required for rollback.")
            }

            echo "🔄 Rolling back ${SERVICE} to tag ${ROLLBACK_TAG}..."

            sh """
                ssh -o StrictHostKeyChecking=no ${USER_SERVER}@${SERVER_IP} '
                    set -e
                    docker pull ${IMAGE_NAME}:${ROLLBACK_TAG}
                    docker tag ${IMAGE_NAME}:${ROLLBACK_TAG} ${IMAGE_NAME}:latest
                    cd ${TARGET_PATH}
                    docker compose up -d ${SERVICE}
                    echo "✅ Rollback to ${ROLLBACK_TAG} complete."
                '
            """
        } else {
            echo "🚀 Deploying latest ${SERVICE}..."

            sh """
                ssh -o StrictHostKeyChecking=no ${USER_SERVER}@${SERVER_IP} '
                    set -e
                    cd ${TARGET_PATH}
                    docker compose pull ${SERVICE}
                    docker compose up -d ${SERVICE}
                    echo "✅ Deployment of ${SERVICE} complete."
                '
            """
        }
    }
}
