import React, { useState, useContext } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import { toast } from "react-toastify";
import { Download, Pencil, Trash2, Check, X, Users } from "lucide-react";
import { baseUrl, GetToken } from "../App";
import { StudentsContext, Student } from "../Context/StudentContext";
import {
  Card,
  PageHeader,
  Button,
  Input,
  TableWrap,
  Th,
  Td,
  EmptyState,
  Badge,
} from "./ui";

const StudentList: React.FC = () => {
  const context = useContext(StudentsContext);
  if (!context) {
    throw new Error("StudentList must be used within a StudentsProvider");
  }
  const { students, setStudents } = context;

  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filteredStudents = students.filter((student) =>
    [student.FirstName, student.LastName, student.StudentId, student.Department]
      .some((field) => (field ?? "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditClick = (student: Student) => {
    setEditingStudentId(student.StudentId);
    setEditFormData({ ...student });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Scores is numeric on the document; sending it as a string would change the
    // stored field's type.
    setEditFormData((prev) => ({
      ...prev,
      [name]: name === "Scores" ? (value === "" ? undefined : Number(value)) : value,
    }));
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
      toast.success("Student updated");
    } catch (error: any) {
      // This used to fail silently, so a save that never persisted still looked
      // like it had worked until the page was reloaded.
      toast.error(
        "Could not update student: " +
          (error?.response?.data?.error || error?.message || "unknown error")
      );
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
      toast.success("Student deleted");
    } catch (error: any) {
      toast.error(
        "Could not delete student: " +
          (error?.response?.data?.error || error?.message || "unknown error")
      );
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.length} registered${
          searchTerm ? ` · ${filteredStudents.length} matching` : ""
        }`}
        actions={
          <CSVLink data={students} filename="students_results.csv">
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CSVLink>
        }
      />

      <Card>
        <div className="border-b border-slate-200 p-4">
          <Input
            type="search"
            placeholder="Search by name, matric number or department…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title={students.length === 0 ? "No students yet" : "No matches"}
            hint={
              students.length === 0
                ? "Upload a student CSV from the Upload page to get started."
                : "Try a different name, matric number or department."
            }
          />
        ) : (
          <TableWrap maxHeight="calc(100vh - 20rem)">
            <thead>
              <tr>
                <Th>First Name</Th>
                <Th>Last Name</Th>
                <Th>Matric No.</Th>
                <Th>Department</Th>
                <Th>Email</Th>
                <Th>Score</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const isEditing = editingStudentId === student.StudentId;
                return (
                  <tr
                    key={student.StudentId}
                    className={isEditing ? "bg-navy-50/40" : "hover:bg-slate-50"}
                  >
                    {isEditing ? (
                      <>
                        <Td>
                          <Input
                            name="FirstName"
                            value={editFormData.FirstName || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td>
                          <Input
                            name="LastName"
                            value={editFormData.LastName || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td className="font-mono text-xs">{student.StudentId}</Td>
                        <Td>
                          <Input
                            name="Department"
                            value={editFormData.Department || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td>
                          <Input
                            name="Email"
                            value={editFormData.Email || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td>
                          <Input
                            type="number"
                            name="Scores"
                            min={0}
                            value={editFormData.Scores ?? ""}
                            onChange={handleEditChange}
                            className="w-24"
                          />
                        </Td>
                        <Td>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(student.StudentId)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td className="font-medium text-navy-900">{student.FirstName}</Td>
                        <Td className="font-medium text-navy-900">{student.LastName}</Td>
                        <Td className="font-mono text-xs">{student.StudentId}</Td>
                        <Td>
                          <Badge tone="navy">{student.Department || "—"}</Badge>
                        </Td>
                        <Td className="text-slate-500">{student.Email || "—"}</Td>
                        <Td>{student.Scores ?? "—"}</Td>
                        <Td>
                          <div className="flex justify-end gap-2">
                            {pendingDelete === student.StudentId ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDelete(student.StudentId)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPendingDelete(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleEditClick(student)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setPendingDelete(student.StudentId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </Td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
};

export default StudentList;
