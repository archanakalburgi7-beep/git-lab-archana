
<?php
session_start();
include 'db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = mysqli_real_escape_string($conn, $_POST['l-user']);
    $pass = mysqli_real_escape_string($conn, $_POST['l-pass']);

    $sql = "SELECT * FROM users WHERE username='$user' AND password='$pass'";
    $result = mysqli_query($conn, $sql);

    if (!$result) {
        die("Query failed: " . mysqli_error($conn));
    }

    if (mysqli_num_rows($result) > 0) {
        // --- HA BADAL KARA ---
        $_SESSION['username'] = $user; // Ata username session madhe save jhala
        // ---------------------
        header("Location: dashboard.html");
        exit();
    } else {
        echo "<script>alert('Invalid Username or Password'); window.location.href='login.html';</script>";
    }
}
?>