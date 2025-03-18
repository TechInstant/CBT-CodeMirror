

const AdminDashboard = () => {
  const user = {
    name: "admin",
    email: "admin@codemirror.com",
  };

  const stats = {
    attempted: 25,
    totalQuestions: 30,
    solved: 15,
    timeTaken: "18m 00s",
    totalTime: "1hr 20mins",
  };

  const sections = [
    { section: "Section 1", questions: 3, attempted: 2, solved: 1, time: "0 hr 0 min 16 sec" },
    { section: "Section 2", questions: 5, attempted: 4, solved: 3, time: "0 hr 0 min 55 sec" },
    { section: "Section 3", questions: 4, attempted: 4, solved: 1, time: "0 hr 0 min 19 sec" },
    { section: "Section 4", questions: 2, attempted: 2, solved: 2, time: "0 hr 0 min 4 sec" },
    { section: "Section 5", questions: 5, attempted: 5, solved: 1, time: "0 hr 1 min 17 sec" },
    { section: "Section 6", questions: 5, attempted: 3, solved: 3, time: "0 hr 3 min 1 sec" },
    { section: "Section 7", questions: 1, attempted: 1, solved: 1, time: "0 hr 2 min 1 sec" },
    { section: "Section 8", questions: 5, attempted: 4, solved: 3, time: "0 hr 2 min 4 sec" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-700 text-white py-3 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold">CM CodeMirror</h1>
        <nav className="space-x-4">
          <a href="#" className="hover:underline">My Tests</a>
          <a href="#" className="hover:underline">My Questions</a>
          <a href="#" className="hover:underline">Report +</a>
        </nav>
        <div className="text-sm">
          <p>{user.name}</p>
          <p className="text-gray-300">{user.email}</p>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow-md rounded-md">
        <button className="w-full py-2 bg-gray-800 text-white font-semibold rounded-md mb-4">
          STATISTICS OVERVIEW
        </button>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-200 rounded-md">
            <p className="text-xl font-bold">{stats.attempted}</p>
            <p className="text-gray-600">Attempted out of {stats.totalQuestions}</p>
          </div>
          <div className="p-4 bg-gray-200 rounded-md">
            <p className="text-xl font-bold">{stats.solved}</p>
            <p className="text-gray-600">Solved of {stats.attempted}</p>
          </div>
          <div className="p-4 bg-gray-200 rounded-md">
            <p className="text-xl font-bold">{stats.timeTaken}</p>
            <p className="text-gray-600">Time taken of {stats.totalTime}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto mt-6 p-6 bg-white shadow-md rounded-md">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">QUESTION(S)</th>
              <th className="border p-2">ATTEMPTED</th>
              <th className="border p-2">SOLVED</th>
              <th className="border p-2">TIME TAKEN</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec, index) => (
              <tr key={index} className="text-center border-b">
                <td className="border p-2">{sec.section}</td>
                <td className="border p-2">{sec.attempted}</td>
                <td className="border p-2">{sec.solved}</td>
                <td className="border p-2">{sec.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
