import Webinar from '../models/Webinar.js';

// Admin creates a new webinar
export const createWebinar = async (req, res) => {
  const { title, description, schedule, maxAttendees, settings, participants } = req.body;

  try {
    const newWebinar = new Webinar({
      title,
      description,
      schedule,
      maxAttendees,
      settings,
      participants,
    });

    await newWebinar.save();
    res.status(201).json({ message: 'Webinar created successfully', webinar: newWebinar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating webinar' });
  }
};

// Admin updates an existing webinar
export const updateWebinar = async (req, res) => {
  const { webinarId } = req.params;
  const { title, description, schedule, maxAttendees, settings, participants } = req.body;

  try {
    const updatedWebinar = await Webinar.findByIdAndUpdate(
      webinarId,
      { title, description, schedule, maxAttendees, settings, participants },
      { new: true }
    );
    
    if (!updatedWebinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }
    res.status(200).json({ message: 'Webinar updated successfully', webinar: updatedWebinar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating webinar' });
  }
};

// Admin deletes a webinar
export const deleteWebinar = async (req, res) => {
  const { webinarId } = req.params;

  try {
    const deletedWebinar = await Webinar.findByIdAndDelete(webinarId);
    
    if (!deletedWebinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }
    res.status(200).json({ message: 'Webinar deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting webinar' });
  }
};

// Admin views all attendees for a webinar
export const viewAttendees = async (req, res) => {
  const { webinarId } = req.params;

  try {
    const webinar = await Webinar.findById(webinarId)
      .populate('attendees.user', 'firstName lastName email'); // Populate user details

    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({ attendees: webinar.attendees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching attendees' });
  }
};

// Admin marks a user as attended for a webinar
export const adminMarkAsAttended = async (req, res) => {
  const { userId, webinarId } = req.params;

  try {
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Find the user in the attendees list
    const attendee = webinar.attendees.find((attendee) => attendee.user.toString() === userId);
    if (!attendee) {
      return res.status(400).json({ message: 'User is not registered for this webinar' });
    }

    // Mark the user as attended
    attendee.attendanceStatus = 'attended';
    await webinar.save();

    res.status(200).json({ message: 'User marked as attended for the webinar' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking user as attended' });
  }
};

// Admin marks a user as missed for a webinar
export const adminMarkAsMissed = async (req, res) => {
  const { userId, webinarId } = req.params;

  try {
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Find the user in the attendees list
    const attendee = webinar.attendees.find((attendee) => attendee.user.toString() === userId);
    if (!attendee) {
      return res.status(400).json({ message: 'User is not registered for this webinar' });
    }

    // Mark the user as missed
    attendee.attendanceStatus = 'missed';
    await webinar.save();

    res.status(200).json({ message: 'User marked as missed for the webinar' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking user as missed' });
  }
};
