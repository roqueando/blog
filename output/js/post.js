$(document).ready(() => {
  $(".read_more").click((event) => {
    let id = $(event.target).attr('data-id')
    let isVisible = $(`#${id}`).is(':visible');
    if (isVisible) {
      $(`#${id}`).hide();
    } else {
      $(`#${id}`).show();
    }
  })
})
