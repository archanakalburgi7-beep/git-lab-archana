<?php
$host = "localhost";
$db_user = "root"; 
$db_pass = "root"; // तुझ्या Workbench चा पासवर्ड इथे टाक, नसेल तर रिकामे "" ठेव
$db_name = "student_db";

// कनेक्शन तयार करणे
$conn = mysqli_connect($host, $db_user, $db_pass, $db_name);

// कनेक्शन तपासणे
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
?>