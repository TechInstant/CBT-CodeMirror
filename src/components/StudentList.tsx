import React, { useState, useContext} from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import { baseUrl, GetToken } from "../App";
import { StudentsContext, Student } from "../Context/StudentContext"; 


const StudentList: React.FC = () => {
  const context = useContext(StudentsContext);
  if (!context) {
    throw new Error("StudentList must be used within a StudentsProvider");
  }
  const { students, setStudents } = context;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  const filteredStudents = students.filter((student) =>
    student.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.StudentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.Department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (student: Student) => {
    setEditingStudentId(student.StudentId);
    setEditFormData({ ...student });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (studentId: string) => {
    try {
      const idToken = await GetToken();
      const updatedStudentId = studentId.replace(/\//g, "_"); 
      
      const updatedData = { ...editFormData, StudentId: updatedStudentId };

      await axios.patch(`${baseUrl}/students/${updatedStudentId}`, updatedData, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      // Update the context state
      setStudents((prev) =>
        prev.map((student) =>
          student.StudentId === studentId ? { ...student, ...editFormData } : student
        )
      );
      
      setEditingStudentId(null);
      setEditFormData({});
    } catch (error) {
      // console.error("Error updating student:", error);
    }
  };

  const handleDelete = async (studentId: string) => {
    try {
      const idToken = await GetToken();
      const updatedStudentId = studentId.replace(/\//g, "_"); 
      
      await axios.delete(`${baseUrl}/students/${updatedStudentId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      setStudents((prev) => prev.filter((student) => student.StudentId !== studentId));
    } catch (error) {
      // console.error("Error deleting student:", error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Student List</h2>
      <input
        type="text"
        placeholder="Search students..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="px-3 py-2 border rounded-md w-min mb-4"
      />
      <div className="bg-white p-4 shadow-md rounded overflow-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">First Name</th>
              <th className="border p-2">Last Name</th>
              <th className="border p-2">Matric No.</th>
              <th className="border p-2">Department</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Score</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.StudentId} className="text-center border-b">
                {editingStudentId === student.StudentId ? (
                  <>
                    <td className="border p-2">
                      <input
                        type="text"
                        name="FirstName"
                        value={editFormData.FirstName || ""}
                        onChange={handleEditChange}
                        className="w-full px-2 py-1 border rounded-md"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        name="LastName"
                        value={editFormData.LastName || ""}
                        onChange={handleEditChange}
                        className="w-full px-2 py-1 border rounded-md"
                      />
                    </td>
                    <td className="border p-2">{student.StudentId}</td>
                    <td className="border p-2">
                      <input
                        type="text"
                        name="Department"
                        value={editFormData.Department || ""}
                        onChange={handleEditChange}
                        className="w-full px-2 py-1 border rounded-md"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        name="Email"
                        value={editFormData.Email || ""}
                        onChange={handleEditChange}
                        className="w-full px-2 py-1 border rounded-md"
                      />
                    </td>
                    <td className="border p-2">{student.Scores}</td>
                    <td className="border p-2 space-x-2">
                      <button onClick={() => handleSaveEdit(student.StudentId)} className="text-green-600 hover:underline">
                        Save
                      </button>
                      <button onClick={handleCancelEdit} className="text-gray-600 hover:underline">
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border p-2">{student.FirstName}</td>
                    <td className="border p-2">{student.LastName}</td>
                    <td className="border p-2">{student.StudentId}</td>
                    <td className="border p-2">{student.Department}</td>
                    <td className="border p-2">{student.Email}</td>
                    <td className="border p-2">{student.Scores}</td>
                    <td className="border p-2 space-x-2">
                      <button onClick={() => handleEditClick(student)} className="text-white bg-green-600 cursor-pointer">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(student.StudentId)} className="text-white bg-red-600 w-1/2 cursor-pointer">
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <CSVLink
          data={students}
          filename="students_results.csv"
          className="bg-green-500 text-white p-2 rounded mt-4 inline-block"
        >
          Download Results
        </CSVLink>
      </div>
    </div>
  );
};

export default StudentList;
