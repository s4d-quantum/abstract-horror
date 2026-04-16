<?php
include '../db_config.php';
include '../authenticate.php';
$global_url = "../";

$currentUserId = isset($_SESSION['user_id']) ? (string)$_SESSION['user_id'] : '';
$canManageFeedback = ($currentUserId === '12');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = isset($_POST['feedback_action']) ? $_POST['feedback_action'] : '';

  if ($action === 'submit_comment') {
    $comment = isset($_POST['feedback_comment']) ? trim($_POST['feedback_comment']) : '';
    $errors = [];

    if ($comment === '') {
      $errors[] = 'Please enter your feedback before submitting.';
    }

    $userId = $currentUserId;
    if ($userId === '') {
      $errors[] = 'Unable to determine the current user.';
    }

    if (empty($errors)) {
      $insertStmt = mysqli_prepare($conn, "INSERT INTO tbl_feedback (user_id, comment) VALUES (?, ?)");

      if ($insertStmt) {
        mysqli_stmt_bind_param($insertStmt, 'ss', $userId, $comment);

        if (mysqli_stmt_execute($insertStmt)) {
          $_SESSION['feedback_success'] = 'Thank you! Your feedback has been submitted.';
        } else {
          $errors[] = 'Unable to save your feedback. Please try again.';
          $_SESSION['feedback_comment_value'] = $comment;
        }

        mysqli_stmt_close($insertStmt);
      } else {
        $errors[] = 'Unable to save your feedback at the moment. Please try again later.';
        $_SESSION['feedback_comment_value'] = $comment;
      }
    } else {
      $_SESSION['feedback_comment_value'] = $comment;
    }

    if (!empty($errors)) {
      $_SESSION['feedback_errors'] = $errors;
    }
  } elseif ($action === 'update_status') {
    if (!$canManageFeedback) {
      $_SESSION['feedback_errors'] = ['You are not authorised to modify feedback status.'];
    } else {
      $feedbackId = isset($_POST['feedback_id']) ? (int)$_POST['feedback_id'] : 0;
      $newStatus = isset($_POST['new_status']) ? trim($_POST['new_status']) : '';

      if ($feedbackId <= 0 || !in_array($newStatus, ['open', 'closed'], true)) {
        $_SESSION['feedback_errors'] = ['Invalid status update request.'];
      } else {
        $updateStmt = mysqli_prepare($conn, "UPDATE tbl_feedback SET status = ? WHERE id = ?");

        if ($updateStmt) {
          mysqli_stmt_bind_param($updateStmt, 'si', $newStatus, $feedbackId);

          if (mysqli_stmt_execute($updateStmt)) {
            $_SESSION['feedback_success'] = 'Feedback status updated.';
          } else {
            $_SESSION['feedback_errors'] = ['Unable to update the feedback status. Please try again.'];
          }

          mysqli_stmt_close($updateStmt);
        } else {
          $_SESSION['feedback_errors'] = ['Unable to update the feedback status at the moment.'];
        }
      }
    }
  }

  header('Location: feedback.php');
  exit;
}

$feedbackErrors = isset($_SESSION['feedback_errors']) && is_array($_SESSION['feedback_errors'])
  ? $_SESSION['feedback_errors']
  : [];
$feedbackSuccess = isset($_SESSION['feedback_success']) ? $_SESSION['feedback_success'] : '';
$feedbackCommentValue = isset($_SESSION['feedback_comment_value']) ? $_SESSION['feedback_comment_value'] : '';

unset($_SESSION['feedback_errors'], $_SESSION['feedback_success'], $_SESSION['feedback_comment_value']);

$feedbackEntries = [];
$feedbackLoadError = '';

$feedbackQuery = mysqli_query(
  $conn,
  "
    SELECT
      f.id,
      f.date,
      f.user_id,
      COALESCE(acc.user_name, f.user_id) AS user_name,
      f.comment,
      f.status
    FROM tbl_feedback AS f
    LEFT JOIN s4d_user_accounts.tbl_accounts AS acc
      ON acc.user_id = f.user_id
    ORDER BY f.date DESC
  "
);

if ($feedbackQuery) {
  while ($row = mysqli_fetch_assoc($feedbackQuery)) {
    $feedbackEntries[] = $row;
  }

  mysqli_free_result($feedbackQuery);
} else {
  $feedbackLoadError = 'Unable to load feedback entries right now.';
}

include "../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <section class="content-header">
    <h1>Feedback</h1>
  </section>

  <section class="content">
    <div class="row">
      <div class="col-md-8">
        <div class="box box-success">
          <div class="box-header with-border">
            <h3 class="box-title">Share Your Thoughts</h3>
          </div>
          <div class="box-body">
            <p>Please enter any feedback, feature requests, bug reports etc here.</p>

            <?php if (!empty($feedbackSuccess)): ?>
              <div class="alert alert-success">
                <?php echo htmlspecialchars($feedbackSuccess, ENT_QUOTES, 'UTF-8'); ?>
              </div>
            <?php endif; ?>

            <?php if (!empty($feedbackErrors)): ?>
              <div class="alert alert-danger">
                <ul>
                  <?php foreach ($feedbackErrors as $error): ?>
                    <li><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></li>
                  <?php endforeach; ?>
                </ul>
              </div>
            <?php endif; ?>

            <form method="post" action="feedback.php">
              <div class="form-group">
                <label for="feedback_comment">Feedback</label>
                <textarea id="feedback_comment"
                          name="feedback_comment"
                          class="form-control"
                          rows="4"
                          placeholder="Type your feedback here..."><?php echo htmlspecialchars($feedbackCommentValue, ENT_QUOTES, 'UTF-8'); ?></textarea>
              </div>
              <input type="hidden" name="feedback_action" value="submit_comment">
              <button type="submit" class="btn btn-success" name="submit_feedback">Submit</button>
            </form>
          </div>
        </div>
      </div>

      <div class="col-md-12">
        <div class="box">
          <div class="box-header with-border">
            <h3 class="box-title">Feedback History</h3>
          </div>
          <div class="box-body">
            <?php if ($feedbackLoadError !== ''): ?>
              <div class="alert alert-warning">
                <?php echo htmlspecialchars($feedbackLoadError, ENT_QUOTES, 'UTF-8'); ?>
              </div>
            <?php endif; ?>

            <table id="feedbackTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <?php if ($canManageFeedback): ?>
                    <th>Actions</th>
                  <?php endif; ?>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($feedbackEntries as $entry): ?>
                  <tr>
                    <td><?php echo htmlspecialchars($entry['date'], ENT_QUOTES, 'UTF-8'); ?></td>
                    <td><?php echo htmlspecialchars($entry['user_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                    <td><?php echo nl2br(htmlspecialchars($entry['comment'], ENT_QUOTES, 'UTF-8')); ?></td>
                    <td><?php echo htmlspecialchars($entry['status'], ENT_QUOTES, 'UTF-8'); ?></td>
                    <?php if ($canManageFeedback): ?>
                      <td>
                        <form method="post" action="feedback.php" class="feedback-status-form">
                          <input type="hidden" name="feedback_action" value="update_status">
                          <input type="hidden" name="feedback_id" value="<?php echo (int)$entry['id']; ?>">
                          <input type="hidden" name="new_status" value="<?php echo $entry['status'] === 'open' ? 'closed' : 'open'; ?>">
                          <button type="submit"
                                  class="btn btn-xs <?php echo $entry['status'] === 'open' ? 'btn-danger' : 'btn-warning'; ?>">
                            <?php echo $entry['status'] === 'open' ? 'Close' : 'Reopen'; ?>
                          </button>
                        </form>
                      </td>
                    <?php endif; ?>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<?php include "../footer.php"; ?>
<script type="text/javascript">
$(function() {
  var tableOptions = {
    pageLength: 10,
    order: [[0, 'desc']]
  };
  <?php if ($canManageFeedback): ?>
  tableOptions.columnDefs = [{
    targets: -1,
    orderable: false,
    searchable: false
  }];
  <?php endif; ?>
  $('#feedbackTable').DataTable(tableOptions);
});
</script>
