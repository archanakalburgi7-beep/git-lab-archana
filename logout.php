<?php
session_start();
session_unset(); // सर्व सेशन व्हेरिएबल्स काढून टाकणे
session_destroy(); // सेशन नष्ट करणे

// लॉगिन पेजवर परत पाठवणे
header("Location: login.html"); 
exit();
?>


