import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import ConnectionTest from "./components/ConnectionTest";
import "./App.css";

function App() {
  return (
    <>
      <Header />

      <main className="main-content">
        <h1>Welcome to RIO Cinema</h1>
        <ConnectionTest />
      </main>

      <Footer />
    </>
  );
}

export default App;