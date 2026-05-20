pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        CI_NAME = 'Jenkins / FarmaExpres Frontend CI'
        FRONTEND_DIR = 'frontend'
    }

    stages {
        stage('Detectar ambiente') {
            steps {
                script {
                    def branchName = getBranchName()
                    def branchKey = getBranchKey()
                    def envFile = getEnvFile(branchKey)

                    if (envFile == '') {
                        echo "Rama de trabajo o Pull Request: ${branchName}. Solo se ejecutan validaciones."
                    }

                    echo "Pipeline: ${env.CI_NAME}"
                    echo "Rama: ${branchName}"
                    echo "Rama normalizada: ${branchKey}"
                    echo "Despliegue habilitado: ${envFile != ''}"
                    if (envFile != '') {
                        echo "Archivo de ambiente: ${envFile}"
                    }
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                script {
                    runInFrontend('npm ci', 'npm ci')
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    runInFrontend('npm run lint', 'npm run lint')
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    runInFrontend('npm run build', 'npm run build')
                }
            }
        }

        stage('Desplegar ambiente') {
            steps {
                script {
                    def envFile = getEnvFile(getBranchKey())

                    if (envFile == '') {
                        echo "Despliegue omitido para rama ${getBranchName()}"
                        return
                    }

                    echo "Desplegando frontend con ${envFile}"
                    runInFrontend(
                        "if docker compose version >/dev/null 2>&1; then docker compose --env-file ${envFile} up -d --build; else docker-compose --env-file ${envFile} up -d --build; fi",
                        "docker compose --env-file ${envFile} up -d --build"
                    )
                }
            }
        }
    }

    post {
        success {
            echo "${env.CI_NAME}: SUCCESS"
        }
        failure {
            echo "${env.CI_NAME}: FAILED. No se realiza despliegue si las validaciones fallan."
        }
    }
}

def getBranchName() {
    return (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '').trim()
}

def getBranchKey() {
    return getBranchName().toLowerCase()
}

def getEnvFile(String branchKey) {
    if (branchKey == 'develop') {
        return '.env.dev'
    }
    if (branchKey == 'qa') {
        return '.env.qa'
    }
    if (branchKey == 'main') {
        return '.env.main'
    }
    return ''
}

def runInFrontend(String unixCommand, String windowsCommand) {
    dir(env.FRONTEND_DIR) {
        runCommand(unixCommand, windowsCommand)
    }
}

def runCommand(String unixCommand, String windowsCommand) {
    if (isUnix()) {
        sh unixCommand
    } else {
        bat windowsCommand
    }
}
