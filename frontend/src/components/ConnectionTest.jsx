import { useState } from "react";
import { testBackendConnection } from "../api";

function ConnectionTest() {
  const [status, setStatus] = useState("Not connected");
  const [databaseTime, setdatabaseTime] = useState("");
  const handleTest = async () => {
    setStatus("Connecting...");

    try {
      const data = await testBackendConnection();
      setStatus(data.message);
      setdatabaseTime(data.databaseTime);
    } catch (error) {
      setStatus(error.message);
      setdatabaseTime(error.message)
    }
  };

  return (
    <div>
      <h2>Backend Connection Test</h2>

      <button onClick={handleTest}>
        Test Connection
      </button>

      <p>Status: {status}</p>
      <p>Database Time: {databaseTime}</p>
    </div>
  );
}

export default ConnectionTest;