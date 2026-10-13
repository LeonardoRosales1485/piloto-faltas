// faltas-pos: plugins viejos (ota_update 6) compilan con un SDK sin android:attr/lStar.
// Se fuerza compileSdk 35 en todas las librerías Android. Debe ir antes de evaluationDependsOn(":app").
subprojects {
    afterEvaluate {
        extensions.findByType(com.android.build.gradle.LibraryExtension::class.java)?.compileSdk = 35
    }
}

