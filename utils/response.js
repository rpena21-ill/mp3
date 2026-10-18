// Helpers for sending every API response in the same { message, data } format.

// Send a response with the given status code, message and data.
function send(res, status, message, data) {
    // A 204 "No Content" response is not allowed to have a body.
    if (status === 204) {
        return res.status(204).end();
    }

    return res.status(status).json({
        message: message,
        data: data === undefined ? {} : data
    })
}

// Send a generic 500 error without leaking database details to the client.
function serverError(res, err) {
    console.error(err);
    return send(res, 500, 'Something went wrong on the server. Please try again later.', {});
}

// Pick the right status code for an error, then send it.
function handleError(res, err) {
    // Errors we created ourselves with badRequest()
    if (err && err.status === 400) {
        return send(res, 400, err.message, {});
    }

    // Mongoose could not convert a value to the right type,
    // e.g. where={"_id": "abc"} or where={"completed": "maybe"}
    if (err && err.name === 'CastError') {
        return send(res, 400, 'A value in the request has the wrong type or format.', {});
    }
    
    // Anything else is unexpected
    return serverError(res, err);
}

module.exports = { send: send, serverError: serverError, handleError: handleError };