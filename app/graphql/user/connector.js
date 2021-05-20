'use strict';

class UserConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetchAll() {
    // this.ctx.model.user.find();
    const users = await this.ctx.model.User.findAll();
    // console.log('1214234123432');
    // console.log(users);
    // const users = [
    //   {
    //     id: 1,
    //     name: 'Alex',
    //   },
    //   {
    //     id: 2,
    //     name: 'Paul Auster',
    //   },
    // ];

    return users;
  }

  fetchById(id) {
    const books = this.fetchAll();
    const res = books.filter(book => book.title === id);
    return res[0];
  }
}

module.exports = UserConnector;

