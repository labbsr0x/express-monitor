const getAllUsers = (req, res) => {
  console.log('Get all users');
  return res.status(200).json({
    success: true,
    count: 2,
    users: [{
      name: 'A'
    }, {
      name: 'B'
    }, {
      name: 'C'
    }]
  });
};

module.exports = {
  getAllUsers
};