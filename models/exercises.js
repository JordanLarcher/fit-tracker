const mongoose = require('mongoose');

const exercisesSchema = new mongoose.Schema({
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            unique: true,
            trim: true,
        },
        bountyMax: {
            type: Number,
            default: 0,
            min: [0, 'Bounty cannot be negative']
        },
        isPlatformActive: {
            type: Boolean,
            default: true,
        },
        scopeCovered: {
            type: [String],
            required: [true, 'Scope covered is required']
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('Exercises', exercisesSchema, 'exercises');