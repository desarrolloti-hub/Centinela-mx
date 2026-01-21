<script>
function goBack(e) {
    e.preventDefault();
    if (document.referrer) {
        window.history.back();
    } else {
        window.location.href = "/index.html";
    }
}
</script>
