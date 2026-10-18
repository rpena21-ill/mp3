// Keeping tasks and users consistent with each other (two-way references).
var User = require('../models/user');
var isValidId = require('./ids').isValidId;
var query = require('./query');
var badRequest = query.badRequest;
var notFound = query.notFound;

// Look up the user a task should be assigned to.
// Returns null if the task is unassigned. Throws 404 / 400 on problems.
async function resolveAssignedUser(fields) {
    if (fields.assignedUser === '') {
        return null;
    }
    var user = await User.findById(fields.assignedUser);
    if (!user) {
        throw notFound('The assigned user does not exist.');
    }
    if (fields.assignedUserName !== undefined && fields.assignedUserName !== user.name) {
        throw badRequest('"assignedUserName" does not match the name of the assigned user.');
    }
    return user;
}

// After a task was saved, fix the pendingTasks of the users involved.
// oldAssignedUser is who the task was assigned to before this request ("" if nobody).
async function syncTaskToUsers(task, oldAssignedUser) {
    var taskId = String(task._id);

    // 1. Remove it from the previous user's pendingTasks
    if (isValidId(oldAssignedUser)) {
        await User.updateOne({ _id: oldAssignedUser }, { $pull: { pendingTasks: taskId } });
    }

    // 2. Add it to the current user's pendingTasks if it is still pending
    if (task.assignedUser !== '' && !task.completed) {
        await User.updateOne({ _id: task.assignedUser }, { $addToSet: { pendingTasks: taskId } });
    }
}

module.exports = { resolveAssignedUser: resolveAssignedUser, syncTaskToUsers: syncTaskToUsers };