// Returns true if the value looks like a MongoDB ObjectId (24 hex characters).
function isValidId(id) {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

module.exports = { isValidId: isValidId };