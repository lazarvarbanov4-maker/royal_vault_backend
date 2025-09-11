import { CourseGroup, Course, Lecture } from '../models/Course.js';
import User from '../models/User.js';

// ------------------ CourseGroup CRUD ------------------

// Create a new CourseGroup
export const createCourseGroup = async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const createdBy = req.user._id;
    const courseGroup = await CourseGroup.create({ title, description, icon, createdBy });
    await courseGroup.populate('createdBy', 'name email');
    res.status(201).json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all CourseGroups with courses and lectures
export const getAllCourseGroups = async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = {};
    
    // Build query based on type filter
    if (type === 'courses') {
      // Only return groups that have courses
      query = { _id: { $in: await Course.distinct('courseGroup') } };
    } else if (type === 'bundles') {
      // Groups with multiple courses
      const courseCounts = await Course.aggregate([
        { $group: { _id: '$courseGroup', count: { $sum: 1 } } },
        { $match: { count: { $gte: 2 } } }
      ]);
      query = { _id: { $in: courseCounts.map(c => c._id) } };
    } else if (type === 'content') {
      // Groups that have lectures
      const courseGroupsWithLectures = await Course.distinct('courseGroup', {
        _id: { $in: await Lecture.distinct('course') }
      });
      query = { _id: { $in: courseGroupsWithLectures } };
    }

    let courseGroups = await CourseGroup.find(query)
      .populate('createdBy', 'name email')
      .lean();

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchResults = [];
      
      for (const group of courseGroups) {
        let includeGroup = false;
        
        // Search in group title and description
        if (searchRegex.test(group.title) || searchRegex.test(group.description)) {
          includeGroup = true;
        }
        
        // Get courses for this group
        const courses = await Course.find({ courseGroup: group._id }).lean();
        const coursesWithLectures = [];
        
        for (const course of courses) {
          // Search in course title and description
          if (searchRegex.test(course.title) || searchRegex.test(course.description)) {
            includeGroup = true;
          }
          
          // Get lectures for this course
          const lectures = await Lecture.find({ course: course._id }).lean();
          const lecturesWithSearch = lectures.filter(lecture =>
            searchRegex.test(lecture.title) || searchRegex.test(lecture.description)
          );
          
          if (lecturesWithSearch.length > 0) {
            includeGroup = true;
          }
          
          coursesWithLectures.push({
            ...course,
            lectures
          });
        }
        
        if (includeGroup) {
          searchResults.push({
            ...group,
            courses: coursesWithLectures
          });
        }
      }
      
      courseGroups = searchResults;
    } else {
      // If no search, populate courses and lectures for all groups
      for (const group of courseGroups) {
        const courses = await Course.find({ courseGroup: group._id }).lean();
        const coursesWithLectures = [];
        
        for (const course of courses) {
          const lectures = await Lecture.find({ course: course._id }).lean();
          coursesWithLectures.push({
            ...course,
            lectures
          });
        }
        
        group.courses = coursesWithLectures;
      }
    }

    res.json(courseGroups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single CourseGroup by ID
export const getCourseGroupById = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!courseGroup) return res.status(404).json({ message: 'CourseGroup not found' });
    
    // Populate courses and lectures
    const courses = await Course.find({ courseGroup: courseGroup._id });
    const coursesWithLectures = [];
    
    for (const course of courses) {
      const lectures = await Lecture.find({ course: course._id });
      coursesWithLectures.push({
        ...course.toObject(),
        lectures
      });
    }
    
    const result = {
      ...courseGroup.toObject(),
      courses: coursesWithLectures
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update CourseGroup
export const updateCourseGroup = async (req, res) => {
  try {
    const updated = await CourseGroup.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('createdBy', 'name email');
    if (!updated) return res.status(404).json({ message: 'CourseGroup not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete CourseGroup
export const deleteCourseGroup = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findById(req.params.id);
    if (!courseGroup) return res.status(404).json({ message: 'CourseGroup not found' });
    
    // Delete all courses in this group
    const courses = await Course.find({ courseGroup: courseGroup._id });
    for (const course of courses) {
      // Delete all lectures in this course
      await Lecture.deleteMany({ course: course._id });
    }
    await Course.deleteMany({ courseGroup: courseGroup._id });
    
    // Delete the course group
    await CourseGroup.findByIdAndDelete(req.params.id);
    res.json({ message: 'CourseGroup and all associated courses and lectures deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Course CRUD ------------------

// Create a new Course
export const createCourse = async (req, res) => {
  try {
    const { title, description, url, courseGroupId } = req.body;
    const createdBy = req.user._id;
    
    const course = await Course.create({ 
      title, 
      description, 
      url, 
      courseGroup: courseGroupId,
      createdBy 
    });
    
    await course.populate('createdBy', 'name email');
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all Courses
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('createdBy', 'name email')
      .populate('courseGroup', 'title')
      .lean();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Course by ID
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('courseGroup', 'title');
    
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Get lectures for this course
    const lectures = await Lecture.find({ course: course._id });
    const result = {
      ...course.toObject(),
      lectures
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Course
export const updateCourse = async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('createdBy', 'name email')
      .populate('courseGroup', 'title');
    if (!updated) return res.status(404).json({ message: 'Course not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Course
export const deleteCourse = async (req, res) => {
  try {
    // Delete all lectures in this course
    await Lecture.deleteMany({ course: req.params.id });
    
    // Delete the course
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course and all associated lectures deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Lecture CRUD ------------------

// Create a new Lecture
export const createLecture = async (req, res) => {
  try {
    const { title, description, videoUrl, pdfUrl, courseId } = req.body;
    
    const lecture = await Lecture.create({ 
      title, 
      description, 
      videoUrl, 
      pdfUrl,
      course: courseId
    });
    
    res.status(201).json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all Lectures
export const getAllLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find()
      .populate('course', 'title')
      .lean();
    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Lecture by ID
export const getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('course', 'title');
    
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    res.json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Lecture
export const updateLecture = async (req, res) => {
  try {
    const updated = await Lecture.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('course', 'title');
    if (!updated) return res.status(404).json({ message: 'Lecture not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Lecture
export const deleteLecture = async (req, res) => {
  try {
    const deleted = await Lecture.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Lecture not found' });
    res.json({ message: 'Lecture deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark Lecture as completed by a User
export const completeLecture = async (req, res) => {
  try {
    const userId = req.user._id;
    const lecture = await Lecture.findById(req.params.id);
    
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    
    if (!lecture.completedBy.includes(userId)) {
      lecture.completedBy.push(userId);
      await lecture.save();
    }
    
    res.json({ message: 'Lecture marked as completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};