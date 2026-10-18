// Validation for request bodies of POST and PUT on users and tasks.
var badRequest = require('./query').badRequest;

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
    return { name: body.name, email: body.email };
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

    return { name: body.name, description: description, deadline: deadline, completed: completed };
}

module.exports = { validateUserBody: validateUserBody, validateTaskBody: validateTaskBody };