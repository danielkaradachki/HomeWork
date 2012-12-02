using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.IO;
using Kendo.Mvc.UI;
using Kendo.Mvc.Extensions;
using UploadInPopUp.Models;
using System.Web.Routing;
namespace UploadInPopUp.Controllers
{
    public class HomeController : Controller
    {
        NorthwindEntities context = new NorthwindEntities();
        private const string BASE_PATH = "~/Content/images/";        
        public ActionResult Index()
        {
            ViewBag.Message = "Upload Photo in PopUp";
           
            return View();
        }

        public ActionResult Read([DataSourceRequest] DataSourceRequest request)
        {
            return Json(context.Employees.ToDataSourceResult(request, e => new
                {
                    e.EmployeeID,
                    e.FirstName,
                    e.LastName,
                    PhotoPath = Url.Content(BASE_PATH) + e.EmployeeID + ".jpg"
                }));
        }

        public FileResult PhotoThumb(int id)
        {
            var employee = context.Employees.FirstOrDefault(e => e.EmployeeID == id);
            if (employee.Photo == null)
            {
                return File(Path.Combine(Server.MapPath(BASE_PATH), "not_available.jpg"), "image");
            }
            return File(employee.Photo, "image");
        }

        public ActionResult About()
        {
            return View();
        }

        public ActionResult Save(HttpPostedFileBase photo, int employeeID)
        {
            if (photo != null)
            {
                var employee = context.Employees.FirstOrDefault(e => e.EmployeeID == employeeID);
                employee.Photo = ReadBytesFromStream(photo.InputStream);
                employee.PhotoPath = photo.FileName;
            }
            return Content("");
        }

        public static byte[] ReadBytesFromStream(Stream stream)
        {
            using (MemoryStream memoryStream = new MemoryStream())
            {
                int BUFFER_SIZE = 1024;
                int bytesRead;
                byte[] buffer = new byte[BUFFER_SIZE];
                while ((bytesRead = stream.Read(buffer, 0, BUFFER_SIZE)) > 0)
                {
                    memoryStream.Write(buffer, 0, bytesRead);
                }

                return memoryStream.ToArray();
            }
        }

        public ActionResult Remove(int employeeID)
        {
            var employee = context.Employees.FirstOrDefault(e => e.EmployeeID == employeeID);
            employee.Photo = null;
            employee.PhotoPath = null;
            context.SaveChanges();

            return Json(new { status = "ok" });
        }
    }
}
