'use strict';

class BookConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  fetchAll() {
    // this.ctx.model.user.find();
    console.log('here');
    const books = [
      {
        title: 'The Awakening',
        author: 'Kate Chopin',
      },
      {
        title: 'City of Glass',
        author: 'Paul Auster',
      },
    ];

    return books;
  }

  fetchByTitle(title) {
    const books = this.fetchAll();
    const res = books.filter(book => book.title === title);
    return res[0];
  }
}

module.exports = BookConnector;

