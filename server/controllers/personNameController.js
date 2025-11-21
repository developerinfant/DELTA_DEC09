const PersonName = require('../models/PersonName');

/**
 * @desc    Get all person names
 * @route   GET /api/person-names
 * @access  Private
 */
const getPersonNames = async (req, res) => {
    try {
        const personNames = await PersonName.find({}).sort({ name: 1 });
        res.json(personNames);
    } catch (error) {
        console.error(`Error fetching person names: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching person names' });
    }
};

/**
 * @desc    Create a new person name
 * @route   POST /api/person-names
 * @access  Private/Admin
 */
const createPersonName = async (req, res) => {
    const { name } = req.body;

    try {
        // Check if person name already exists
        const existingPersonName = await PersonName.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (existingPersonName) {
            return res.status(400).json({ message: 'Person name already exists' });
        }

        // Create new person name
        const personName = new PersonName({ name });
        const createdPersonName = await personName.save();

        res.status(201).json(createdPersonName);
    } catch (error) {
        console.error(`Error creating person name: ${error.message}`);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Person name already exists' });
        }
        res.status(500).json({ message: 'Server error while creating person name' });
    }
};

/**
 * @desc    Update a person name
 * @route   PUT /api/person-names/:id
 * @access  Private/Admin
 */
const updatePersonName = async (req, res) => {
    const { name } = req.body;

    try {
        const personName = await PersonName.findById(req.params.id);
        if (!personName) {
            return res.status(404).json({ message: 'Person name not found' });
        }

        // Check if another person name with the same name already exists
        const existingPersonName = await PersonName.findOne({ 
            name: new RegExp(`^${name}$`, 'i'),
            _id: { $ne: req.params.id }
        });
        if (existingPersonName) {
            return res.status(400).json({ message: 'Person name already exists' });
        }

        personName.name = name;
        personName.updatedAt = Date.now();
        const updatedPersonName = await personName.save();

        res.json(updatedPersonName);
    } catch (error) {
        console.error(`Error updating person name: ${error.message}`);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Person name already exists' });
        }
        res.status(500).json({ message: 'Server error while updating person name' });
    }
};

/**
 * @desc    Delete a person name
 * @route   DELETE /api/person-names/:id
 * @access  Private/Admin
 */
const deletePersonName = async (req, res) => {
    try {
        const personName = await PersonName.findById(req.params.id);
        if (!personName) {
            return res.status(404).json({ message: 'Person name not found' });
        }

        await personName.remove();
        res.json({ message: 'Person name removed' });
    } catch (error) {
        console.error(`Error deleting person name: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting person name' });
    }
};

module.exports = {
    getPersonNames,
    createPersonName,
    updatePersonName,
    deletePersonName
};