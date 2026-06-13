const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const { signToken } = require('../utils/token');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email associated with this Google account.'), null);
        }

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName,
              email,
              googleId: profile.id,
            });
          }
        }

        const token = signToken({ id: user._id, email: user.email, role: user.role });
        return done(null, { user, token });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
