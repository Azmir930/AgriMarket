<?php
/**
 * Database Configuration
 * Agriculture Product Marketplace
 */

class Database {
   private $host = "localhost";
   private $db_name = "agriculture_marketplace";
   private $username = "root";
   private $password = "";  // Update with your actual password
   private $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8mb4");
            return $this->conn;
        } catch(PDOException $exception) {
            error_log("Database Connection Error: " . $exception->getMessage());
            die(json_encode(['status' => false, 'message' => 'Database connection failed']));
        }
    }
}
?>
