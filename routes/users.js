var User = require('../models/user');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;

var send = response.send;
var serverError = response.serverError;

module.exports = function (router) {

    // ----- /api/users -----
    var usersRoute = router.route('/users');

    // GET /api/users: list all users
    usersRoute.get(async function (req, res) {
        try {
            var users = await User.find();
            return send(res, 200, 'OK', users);
        } catch (err) {
            return serverError(res, err);
        }
    });

    // ----- /api/users/:id -----
    var userRoute = router.route('/users/:id');

    // GET /api/users/:id: one user, or 404
    userRoute.get(async function (req, res) {
        try {
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'User not found', {});
            }

            var user = await User.findById(req.params.id);
            if (!user) {
                return send(res, 404, 'User not found', {});
            }

            return send(res, 200, 'OK', user);
        } catch (err) {
            return serverError(res, err);
        }
    });

    // POST /api/users: create a user (minimal version, validation comes in Step 6)
    usersRoute.post(async function (req, res) {
        try {
            var user = new User({
                name: req.body.name,
                email: req.body.email
            });
            
            var saved = await user.save();
            return send(res, 201, 'User created', saved);
        } catch (err) {
            return serverError(res, err);
        }
    });

    return router;
};