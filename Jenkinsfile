pipeline {
  agent any

  environment {
    SPRING_PROFILES_ACTIVE = 'prod'
    DB_URL = credentials('petites_db_url')
    DB_USER = credentials('petites_db_user')
    DB_PASSWORD = credentials('petites_db_password')
    OAUTH2_ISSUER_URI = credentials('petites_oauth2_issuer_uri')
    PORT = '8080'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build') {
      steps {
        sh 'cd backend && ./mvnw -DskipTests clean package'
      }
    }

    stage('Test') {
      steps {
        sh 'cd backend && ./mvnw test'
      }
    }

    stage('Docker Build') {
      steps {
        sh 'docker build -t petites-backend:${BUILD_NUMBER} ./backend'
      }
    }

    stage('Deploy') {
      steps {
        echo 'Deploy step goes here (docker run/compose/remote deploy).'
      }
    }
  }
}
