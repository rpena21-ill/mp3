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

// Read and check the "select" parameter.
// Used by the list routes and by /users/:id and /tasks/:id.
function parseSelect(query) {
    var select = parseJsonParam(query, 'select');
    if (select === undefined) {
        return undefined;
    }

    if (!isPlainObject(select)) {
        throw badRequest('The "select" parameter must be a JSON object.');
    }

    var hasInclude = false;
    var hasExclude = false;
    Object.keys(select).forEach(function (field) {
        var value = select[field];
        if (value !== 1 && value !== 0) {
            throw badRequest('Each field in "select" must be 1 (include) or 0 (exclude).');
        }

        if (field === '_id') {
            return; // _id is the one field allowed to differ, skip it
        }

        if (value === 1) {
            hasInclude = true;
        } else {
            hasExclude = true;
        }
    });

    if (hasInclude && hasExclude) {
        throw badRequest('"select" cannot mix included (1) and excluded (0) fields, except for "_id".');
    }
    return select;
}

// Read a parameter that must be a whole number >= 0 (used for skip and limit).
function parseNonNegativeInt(query, name) {
    var value = parseJsonParam(query, name);
    if (value === undefined) {
        return undefined;
    }

    if (!Number.isInteger(value) || value < 0) {
        throw badRequest('The "' + name + '" parameter must be a whole number of 0 or more.');
    }
    
    return value;
}

// Run a find() on the given model using the URL's query parameters.
// Returns a list of documents, or a number if count=true.
async function findMany(Model, query, defaultLimit) {
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

    // ----- select -----
    var select = parseSelect(query);

    // ----- skip and limit -----
    var skip = parseNonNegativeInt(query, 'skip');
    var explicitLimit = parseNonNegativeInt(query, 'limit'); // what the client sent, if anything
    var limit = explicitLimit === undefined ? defaultLimit : explicitLimit;

    // ----- count -----
    var count = parseJsonParam(query, 'count');
    if (count !== undefined && typeof count !== 'boolean') {
        throw badRequest('The "count" parameter must be true or false.');
    }

    // ----- count=true: return a number instead of documents -----
    if (count === true) {
        var countQuery = Model.countDocuments(where || {});
        if (skip !== undefined) {
            countQuery = countQuery.skip(skip);
        }

        if (explicitLimit !== undefined && explicitLimit > 0) {
            countQuery = countQuery.limit(explicitLimit);
        }

        return countQuery.exec();
    }

    // ----- otherwise: build the find query step by step, then run it -----
    var dbQuery = Model.find(where || {});
    if (sort !== undefined) {
        dbQuery = dbQuery.sort(sort);
    }
    if (select !== undefined) {
        dbQuery = dbQuery.select(select);
    }
    if (skip !== undefined) {
        dbQuery = dbQuery.skip(skip);
    }
    if (limit !== undefined) {
        dbQuery = dbQuery.limit(limit);
    }

    return dbQuery.exec();
}

module.exports = { findMany: findMany, badRequest: badRequest, parseSelect: parseSelect };