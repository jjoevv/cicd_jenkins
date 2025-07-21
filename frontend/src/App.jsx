import { useEffect, useState } from "react";
import Home from "./pages/Page";

function App() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/posts?_limit=10")
      .then((res) => res.json())
      .then((data) => setPosts(data));
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-4">
      <Home/>
      <h2 className="text-xl font-semibold mb-2 text-gray-700">Latest Postssssss</h2>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id} className="border p-4 rounded hover:shadow transition">
            <h3 className="font-bold text-lg text-blue-600">{post.title}</h3>
            <p className="text-gray-700">{post.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
