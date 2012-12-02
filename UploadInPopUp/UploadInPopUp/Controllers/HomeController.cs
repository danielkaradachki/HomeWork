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
        private const int BUFFER_SIZE = 4096;

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
                    e.LastName
                }));
        }

        public ActionResult Update(int employeeID)
        {
            var employee = GetEmployeeByID(employeeID);
            if (TryUpdateModel(employee))
            {
                context.SaveChanges();
            }

            return Json(ModelState.ToDataSourceResult());
        }

        public ActionResult Create(string tempPath)
        {
            var employee = new Employee();
           if (TryUpdateModel(employee))
            {
                if (!string.IsNullOrEmpty(tempPath))
                {
                    employee.Photo = System.IO.File.ReadAllBytes(tempPath);
                    System.IO.File.Delete(tempPath);
                }
                context.Employees.AddObject(employee);
                context.SaveChanges();
            }

            return Json(ModelState.ToDataSourceResult());
        }

        public FileResult PhotoThumb(int? id)
        {
            var employee = GetEmployeeByID(id);
            if (employee == null || employee.Photo == null)
            {
                return File(Path.Combine(Server.MapPath(BASE_PATH), "not_available.jpg"), "image");
            }

            return File(employee.Photo, "image");
        }
   

        public ActionResult Save(HttpPostedFileBase photo, int? employeeID)
        {
            if (employeeID.HasValue)
            {
                var employee = GetEmployeeByID(employeeID);
                employee.Photo = ReadBytesFromStream(photo.InputStream);
                context.SaveChanges();
                return Json(new { path = Url.Action("PhotoThumb", "Home") + "/" + employeeID }, "text/plain");
            }
            else
            {
                var name = Guid.NewGuid().ToString();
                var extension = Path.GetExtension(photo.FileName);
                var tempPath = Path.Combine(BASE_PATH, name + "." + extension);
                photo.SaveAs(tempPath);
                return Json(new { path = Url.Content(tempPath), tempPath = true }, "text/plain");
            }           
        }

        public ActionResult RemoveImage(int? employeeID, string tempPath)
        {
            if (employeeID.HasValue)
            {
                var employee = GetEmployeeByID(employeeID);
                employee.Photo = null;
                context.SaveChanges();
            }
            else
            {
                System.IO.File.Delete(tempPath);
            }

            return Json(new { path = Url.Action("PhotoThumb", "Home") });
        }

        public ActionResult About()
        {
            return View();
        }

        private Employee GetEmployeeByID(int? id)
        {
            var employee = context.Employees.FirstOrDefault(e=> e.EmployeeID == id);
            return employee;
        }

        public static byte[] ReadBytesFromStream(Stream stream)
        {
            using (MemoryStream memoryStream = new MemoryStream())
            {
                int bytesRead;
                byte[] buffer = new byte[BUFFER_SIZE];
                while ((bytesRead = stream.Read(buffer, 0, BUFFER_SIZE)) > 0)
                {
                    memoryStream.Write(buffer, 0, bytesRead);
                }

                return memoryStream.ToArray();
            }
        }
    }
}
