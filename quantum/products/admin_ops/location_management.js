(function ($) {
  $(function () {
    var $scanInput = $('#scan-imei');
    var $tableBody = $('#location-devices tbody');
    var $errorBox = $('#scan-error');
    var $noDevicesRow = $('#no-devices-row');

    function showError(message) {
      $errorBox.text(message).removeClass('hide');
    }

    function clearError() {
      $errorBox.addClass('hide').text('');
    }

    function updateEmptyState() {
      if ($tableBody.find('tr[data-imei]').length === 0) {
        $noDevicesRow.removeClass('hide');
      } else {
        $noDevicesRow.addClass('hide');
      }
    }

    function createHiddenField(name, value) {
      return $('<input>', {
        type: 'hidden',
        name: name,
        value: value
      });
    }

    function appendRow(device) {
      var $row = $('<tr>').attr('data-imei', device.item_imei);

      [
        { text: device.item_imei, name: 'item_imei[]', value: device.item_imei },
        { text: device.item_details, name: 'item_details[]', value: device.item_details },
        { text: device.brand, name: 'item_brand[]', value: device.brand },
        { text: device.grade, name: 'item_grade[]', value: device.grade },
        { text: device.color, name: 'item_color[]', value: device.color },
        { text: device.gb, name: 'item_gb[]', value: device.gb },
        { text: device.current_tray, name: 'current_tray[]', value: device.current_tray }
      ].forEach(function (column) {
        var $td = $('<td>').text(column.text);
        $td.append(createHiddenField(column.name, column.value));
        $row.append($td);
      });

      var $actionTd = $('<td>');
      var $removeButton = $('<button>', {
        type: 'button',
        class: 'btn btn-danger btn-sm remove-device',
        html: '<i class="fa fa-times"></i>'
      });

      $actionTd.append($removeButton);
      $row.append($actionTd);

      $tableBody.append($row);
      updateEmptyState();
    }

    function handleScan() {
      var imei = $scanInput.val().trim();

      if (!imei) {
        showError('Enter or scan an IMEI to add it.');
        return;
      }

      if ($tableBody.find('tr[data-imei="' + imei + '"]').length) {
        showError('IMEI ' + imei + ' is already in the list.');
        $scanInput.val('').focus();
        return;
      }

      clearError();
      $scanInput.prop('disabled', true);

      $.ajax({
        url: 'includes/fetch_device.php',
        method: 'POST',
        dataType: 'json',
        data: { item_imei: imei }
      })
        .done(function (response) {
          if (response && response.success && response.device) {
            appendRow(response.device);
            $scanInput.val('');
          } else {
            showError(
              (response && response.message) ?
                response.message :
                'Device not found or unavailable for moving.'
            );
          }
        })
        .fail(function () {
          showError('Unable to fetch device details. Please try again.');
        })
        .always(function () {
          $scanInput.prop('disabled', false).focus();
        });
    }

    $scanInput.on('keypress', function (event) {
      if (event.which === 13) {
        event.preventDefault();
        handleScan();
      }
    });

    $tableBody.on('click', '.remove-device', function () {
      $(this).closest('tr').remove();
      updateEmptyState();
      $scanInput.focus();
    });

    updateEmptyState();
    $scanInput.focus();
  });
})(jQuery);
