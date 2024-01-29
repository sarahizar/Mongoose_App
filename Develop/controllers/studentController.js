// ObjectId() method for converting studentId string into an ObjectId for querying database
const { ObjectId } = require('mongoose').Types;
const { Student, Course } = require('../models');

// TODO: Create an aggregate function to get the number of students overall
const headCount = async () => {
  try {
    const result = await Student.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    // Extract the count from the result or default to 0 if no documents are found
    const numberOfStudents = result.length > 0 ? result[0].count : 0;

    return numberOfStudents;
  } catch (error) {
    console.error('Error in Head Count:', error);
    throw error;
  }
};

//const numberOfStudents = await Student.aggregate();
 // return numberOfStudents;

const grade = async (studentId) => {
  try {
    /////////////////////////// Validated that studentId is a valid ObjectId
    if (!ObjectId.isValid(studentId)) {
      throw new Error('Invalid ObjectId');
    }
// TODO: Ensure we include only the student who can match the given ObjectId using the $match operator
    const result = await Student.aggregate([
      {
        $match: { _id: new ObjectId(studentId) },
      },
      {
        $unwind: '$assignments',
      },

      // TODO: Group information for the student with the given ObjectId alongside an overall grade calculated using the $avg operator
      {
        $group: {
          _id: '$_id',
          overallGrade: { $avg: '$assignments.grade' },
        },
      },
    ]);

    return result;
  } catch (error) {
    console.error('Error in Grade Calculation:', error);
    throw error;
  }
};

module.exports = {
  // Get all students
  async getStudents(req, res) {
    try {
      // Retrieve all students and calculate the total number of students
      const students = await Student.find();
      const studentObj = {
        students,
        headCount: await headCount(),
      };
      return res.json(studentObj);
    } catch (err) {
      console.log(err);
      return res.status(500).json(err);
    }
  },

  // Get a single student and their overall grade
  async getSingleStudent(req, res) {
    try {
      const studentId = req.params.studentId;

      // Validate that studentId is a valid ObjectId
      if (!ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: 'Invalid studentId' });
      }

      // Retrieve a single student and calculate their overall grade
      const student = await Student.findOne({ _id: studentId }).select('-__v').lean();

      if (!student) {
        return res.status(404).json({ message: 'No student with that ID' });
      }

      res.json({
        student,
        grade: await grade(studentId),
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json(err);
    }
  },

  // Create a new student
  async createStudent(req, res) {
    try {
      const student = await Student.create(req.body);
      res.json(student);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  // Delete a student and remove them from the course
  async deleteStudent(req, res) {
    try {
      const student = await Student.findOneAndRemove({ _id: req.params.studentId });

      if (!student) {
        return res.status(404).json({ message: 'No such student exists' });
      }

      const course = await Course.findOneAndUpdate(
        { students: req.params.studentId },
        { $pull: { students: req.params.studentId } },
        { new: true }
      );

      if (!course) {
        return res.status(404).json({
          message: 'Student deleted, but no courses found',
        });
      }

      res.json({ message: 'Student successfully deleted' });
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  },

  // Add an assignment to a student
  async addAssignment(req, res) {
    try {
      console.log('You are adding an assignment');
      console.log(req.body);
      const student = await Student.findOneAndUpdate(
        { _id: req.params.studentId },
        { $addToSet: { assignments: req.body } },
        { runValidators: true, new: true }
      );

      if (!student) {
        return res
          .status(404)
          .json({ message: 'No student found with that ID :(' });
      }

      res.json(student);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  // Remove assignment from a student
  async removeAssignment(req, res) {
    try {
      const student = await Student.findOneAndUpdate(
        { _id: req.params.studentId },
        { $pull: { assignments: { assignmentId: req.params.assignmentId } } },
        { runValidators: true, new: true }
      );

      if (!student) {
        return res
          .status(404)
          .json({ message: 'No student found with that ID :(' });
      }

      res.json(student);
    } catch (err) {
      res.status(500).json(err);
    }
  },
};