// Builds and runs the database query for GET /users and GET /tasks
// from the query string parameters (where, sort, select, ...).

// Create an error that should be sent to the client as a 400.
function badRequest(message) {
    var err = new Error(message);
    err.status = 400;
    return err;
}

// Read one query string parameter and parse it as JSON.
// Returns undefined if the parameter is not in the URL.
function parseJsonParam(query, name) {
    var raw = query[name];
    if (raw === undefined) {
        return undefined;
    }

    try {
        return JSON.parse(raw);
    } catch (e) {
        throw badRequest('The "' + name + '" parameter must be valid JSON.');
    }
}

// True for {...} objects, false for arrays, null, numbers, strings.
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Run a find() on the given model using the URL's query parameters.
async function findMany(Model, query) {
    // ----- where -----
    var where = parseJsonParam(query, 'where');
    if (where !== undefined && !isPlainObject(where)) {
        throw badRequest('The "where" parameter must be a JSON object.');
    }

    // ----- sort -----
    var sort = parseJsonParam(query, 'sort');
    if (sort !== undefined) {
        if (!isPlainObject(sort)) {
            throw badRequest('The "sort" parameter must be a JSON object.');
        }
        
        Object.keys(sort).forEach(function (field) {
            if (sort[field] !== 1 && sort[field] !== -1) {
                throw badRequest('Each field in "sort" must be 1 (ascending) or -1 (descending).');
            }
        });
    }

    // ----- build the query step by step, then run it -----
    var dbQuery = Model.find(where || {});
    if (sort !== undefined) {
        dbQuery = dbQuery.sort(sort);
    }

    return dbQuery.exec();
}

module.exports = { findMany: findMany, badRequest: badRequest };