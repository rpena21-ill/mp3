// Validation for request bodies of POST and PUT on users and tasks.
var badRequest = require('./query').badRequest;

var isValidId = require('./ids').isValidId;

// True for a string with at least one non-space character.
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

// Accepts true/false, or "true"/"false" (form data sends strings).
function parseBoolean(value, name) {
    if (value === true || value === 'true') {
        return true;
    }
    if (value === false || value === 'false') {
        return false;
    }
    throw badRequest('"' + name + '" must be true or false.');
}

// Accepts a date string ("2026-11-01") or a timestamp in milliseconds,
// either as a number or as a string of digits (form data).
function parseDate(value, name) {
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
        value = Number(value);
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw badRequest('"' + name + '" must be a valid date.');
    }
    var date = new Date(value);
    if (isNaN(date.getTime())) {
        throw badRequest('"' + name + '" must be a valid date.');
    }
    return date;
}

// Check a user body and return only the fields we allow.
function validateUserBody(body) {
    body = body || {};
    if (!isNonEmptyString(body.name)) {
        throw badRequest('A user must have a name.');
    }
    if (!isNonEmptyString(body.email)) {
        throw badRequest('A user must have an email.');
    }

    // pendingTasks: a list of task ids (missing means an empty list)
    var pendingTasks = [];
    if (body.pendingTasks !== undefined && body.pendingTasks !== null) {
        var list = body.pendingTasks;
        // Form data sends a single value as a plain string
        if (typeof list === 'string') {
            list = list === '' ? [] : [list];
        }
        if (!Array.isArray(list)) {
            throw badRequest('"pendingTasks" must be a list of task ids.');
        }
        list.forEach(function (id) {
            if (typeof id !== 'string' || !isValidId(id)) {
                throw badRequest('"pendingTasks" contains an invalid task id.');
            }
        });
        // Remove duplicates: the same task listed twice is still one task
        pendingTasks = Array.from(new Set(list));
    }

    return { name: body.name, email: body.email, pendingTasks: pendingTasks };
}

// Check a task body and return only the fields we allow, with defaults filled in.
function validateTaskBody(body) {
    body = body || {};
    if (!isNonEmptyString(body.name)) {
        throw badRequest('A task must have a name.');
    }
    if (body.deadline === undefined || body.deadline === null || body.deadline === '') {
        throw badRequest('A task must have a deadline.');
    }
    var deadline = parseDate(body.deadline, 'deadline');

    var description = '';
    if (body.description !== undefined && body.description !== null) {
        if (typeof body.description !== 'string') {
            throw badRequest('"description" must be text.');
        }
        description = body.description;
    }

    var completed = false;
    if (body.completed !== undefined && body.completed !== null) {
        completed = parseBoolean(body.completed, 'completed');
    }

    // assignedUser: "" means unassigned, otherwise it must be a valid id
    var assignedUser = '';
    if (body.assignedUser !== undefined && body.assignedUser !== null) {
        if (typeof body.assignedUser !== 'string') {
            throw badRequest('"assignedUser" must be a user id, or "" for no user.');
        }
        assignedUser = body.assignedUser;
        if (assignedUser !== '' && !isValidId(assignedUser)) {
            throw badRequest('"assignedUser" is not a valid user id.');
        }
    }

    // assignedUserName: optional (undefined = not given, we fill it in later)
    var assignedUserName;
    if (body.assignedUserName !== undefined && body.assignedUserName !== null) {
        if (typeof body.assignedUserName !== 'string') {
            throw badRequest('"assignedUserName" must be text.');
        }
        assignedUserName = body.assignedUserName;
    }

    // An unassigned task can't claim to belong to someone
    if (assignedUser === '' && assignedUserName !== undefined &&
        assignedUserName !== 'unassigned' && assignedUserName !== '') {
        throw badRequest('An unassigned task must have "assignedUserName" set to "unassigned".');
    }

    return {
        name: body.name,
        description: description,
        deadline: deadline,
        completed: completed,
        assignedUser: assignedUser,
        assignedUserName: assignedUserName
    };
}

module.exports = { validateUserBody: validateUserBody, validateTaskBody: validateTaskBody };