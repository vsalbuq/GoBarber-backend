module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'users', // table name
      'avatar_id', // name of the column that will be added
      {
        // column settings
        type: Sequelize.INTEGER,
        references: {
          model: 'files',
          key: 'id',
        },
        onUpdate: 'CASCADE', // when file updated, user is too
        onDelete: 'SET NULL', // when file deleted, user column is set to null
        allowNull: true,
      }
    );
  },

  down: queryInterface => {
    return queryInterface.removeColumn('users', 'avatar_id');
  },
};
