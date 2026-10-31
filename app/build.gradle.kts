import org.gradle.api.tasks.compile.JavaCompile

plugins {
    id("com.android.application")
}

val releaseStoreFile = System.getenv("DAILYCARD_KEYSTORE")
val releaseStorePassword = System.getenv("DAILYCARD_KEYSTORE_PASSWORD")
val releaseKeyAlias = System.getenv("DAILYCARD_KEY_ALIAS")
val releaseKeyPassword = System.getenv("DAILYCARD_KEY_PASSWORD")

val hasReleaseSigning = !releaseStoreFile.isNullOrBlank() &&
    !releaseStorePassword.isNullOrBlank() &&
    !releaseKeyAlias.isNullOrBlank() &&
    !releaseKeyPassword.isNullOrBlank()

android {
    namespace = "ru.dailycard.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "ru.dailycard.app"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "0.2.0"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword!!
                keyAlias = releaseKeyAlias!!
                keyPassword = releaseKeyPassword!!
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.findByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = false
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}
