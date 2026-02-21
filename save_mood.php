<?php
session_start();
include 'db.php';
date_default_timezone_set('Asia/Kolkata'); // Timezone fix sathi

$data = json_decode(file_get_contents("php://input"), true);

if(isset($data['mood']) && isset($_SESSION['username'])) {
    $username = $_SESSION['username']; 
    $mood = mysqli_real_escape_string($conn, $data['mood']);
    $suggestion = mysqli_real_escape_string($conn, $data['suggestion']); // Suggestion ghene
    $currentDate = date("Y-m-d");
    $currentTime = $data['time']; // JS kadun aleli exact vel

    $sql = "INSERT INTO user_moods (user_name, emotion_name, suggestion, detected_date, detected_time) 
            VALUES ('$username', '$mood', '$suggestion', '$currentDate', '$currentTime')";
    
    if(mysqli_query($conn, $sql)) {
        echo json_encode(["status" => "Success"]);
    } else {
        echo json_encode(["status" => "Error", "message" => mysqli_error($conn)]);
    }
}
?>