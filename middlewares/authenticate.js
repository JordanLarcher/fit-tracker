const isAuthenticated = (req, res, next) => {
    console.log('checking authentication status', req.isAuthenticated());
    if(req.user) {
        console.log('User session found for: ', req.user.username || req.user.displayName || "Unknow user")
    }else
    {
        console.log('No user session found for: ', req.user.username);
    }

    if(!req.isAuthenticated()){
        return res.status(401).send('Not authenticated');
    }

    next();
}

module.exports = isAuthenticated;