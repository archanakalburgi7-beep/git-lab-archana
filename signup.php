<?php
include 'db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name  = $_POST['s-name'];
    $email = $_POST['s-email'];
    $user  = $_POST['s-user'];
    $pass  = $_POST['s-pass'];

    // 1. 'users' table (Username must be PRIMARY KEY or UNIQUE)
    $sql1 = "INSERT INTO users (username, password) VALUES ('$user', '$pass')";
    
    if (mysqli_query($conn, $sql1)) {
        
        // 2. 'user_profiles' - Password column pan add kela aahe
        $sql2 = "INSERT INTO user_profiles (Full_Name, Email_Address, UserName, Password) 
                 VALUES ('$name', '$email', '$user', '$pass')";
        mysqli_query($conn, $sql2);

        // 3. 'user_status'
        $sql3 = "INSERT INTO user_status (Email) VALUES ('$email')";
        mysqli_query($conn, $sql3);

        header("Location: dashboard.html");
        exit();
    } else {
        // Jar SQL error asel tar to ithe disel
        echo "Error: " . mysqli_error($conn);
    }
}
?>